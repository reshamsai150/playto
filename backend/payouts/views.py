from django.db import transaction
from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Merchant, LedgerEntry, Payout, IdempotencyKey
from .serializers import PayoutSerializer
from .tasks import process_payout
from django.utils import timezone

def get_merchant_balance(merchant):
    credits = LedgerEntry.objects.filter(merchant=merchant, type='credit').aggregate(Sum('amount_paise'))['amount_paise__sum'] or 0
    debits = LedgerEntry.objects.filter(merchant=merchant, type='debit').aggregate(Sum('amount_paise'))['amount_paise__sum'] or 0
    balance = credits - debits
    
    # Held balance computation: pending and processing payouts that haven't been debited yet.
    # Wait, in the specs, "Hold funds (record debit OR reserved state)"
    # If we record a debit immediately, we don't need a separate held calculation from balance, but we can compute held_balance as sum of pending/processing.
    held_balance = Payout.objects.filter(
        merchant=merchant, 
        status__in=['pending', 'processing']
    ).aggregate(Sum('amount_paise'))['amount_paise__sum'] or 0
    
    available_balance = balance # Assuming debit isn't recorded immediately or IS recorded immediately.
    # Let's decide: Creating payout immediately creates a debit in Ledger.
    # So the available balance already reflects the held funds. 
    # Therefore, available_balance = total credits - all debits.
    # held_balance = Sum(pending/processing).
    return available_balance, held_balance


@api_view(['GET'])
def get_balance(request):
    # Dummy auth: select first merchant
    merchant = Merchant.objects.first()
    if not merchant:
        return Response({'detail': 'No merchant found'}, status=status.HTTP_404_NOT_FOUND)
        
    available_balance, held_balance = get_merchant_balance(merchant)
    return Response({
        "available_balance": available_balance,
        "held_balance": held_balance
    })

@api_view(['POST'])
def create_payout(request):
    idempotency_key_header = request.headers.get('Idempotency-Key')
    if not idempotency_key_header:
        return Response({"detail": "Idempotency-Key header missing"}, status=status.HTTP_400_BAD_REQUEST)

    merchant = Merchant.objects.first() # Dummy auth
    if not merchant:
        return Response({'detail': 'No merchant found'}, status=status.HTTP_404_NOT_FOUND)

    # 1. Idempotency Check & Lock
    try:
        with transaction.atomic():
            # Atomically get or create the idempotency key and lock it
            idem_key, created = IdempotencyKey.objects.select_for_update().get_or_create(
                merchant=merchant, 
                key=idempotency_key_header
            )

            if not created:
                if idem_key.is_expired:
                    # Key expired, let's treat it as a new request (or return error depending on policy)
                    # For this spec, we'll allow reuse if expired.
                    idem_key.response_payload = None
                    idem_key.save()
                elif idem_key.response_payload:
                    # Return cached response
                    return Response(idem_key.response_payload, status=idem_key.response_status_code)
                else:
                    # Request is already in progress
                    return Response({"detail": "Request already in progress"}, status=status.HTTP_409_CONFLICT)

            # Proceed with payout creation since it's the first time we see this key (or it was locked successfully)
            serializer = PayoutSerializer(data=request.data)
            if not serializer.is_valid():
                idem_key.response_payload = serializer.errors
                idem_key.response_status_code = status.HTTP_400_BAD_REQUEST
                idem_key.save()
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            amount = serializer.validated_data.get('amount_paise')
            if amount <= 0:
                return Response({"detail": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Transaction Atomic for Payout & Balance
            # Lock the merchant row to prevent concurrent overdraws
            merchant_locked = Merchant.objects.select_for_update().get(id=merchant.id)
            
            available_balance, _ = get_merchant_balance(merchant_locked)
            
            if available_balance < amount:
                error_response = {"detail": "Insufficient balance"}
                idem_key.response_payload = error_response
                idem_key.response_status_code = status.HTTP_400_BAD_REQUEST
                idem_key.save()
                return Response(error_response, status=status.HTTP_400_BAD_REQUEST)

            # Create payout record
            payout = Payout.objects.create(
                merchant=merchant_locked,
                amount_paise=amount,
                status='pending',
                idempotency_key=idempotency_key_header,
                bank_account_id=serializer.validated_data.get('bank_account_id')
            )
            
            # Record debit in Ledger
            LedgerEntry.objects.create(
                merchant=merchant_locked,
                type='debit',
                amount_paise=amount,
                reference_id=f"payout_{payout.id}"
            )
            
            response_data = {
                "id": payout.id,
                "amount_paise": payout.amount_paise,
                "status": payout.status,
                "created_at": payout.created_at.isoformat(),
            }
            # Save final response to the locked idempotency key
            idem_key.response_payload = response_data
            idem_key.response_status_code = status.HTTP_201_CREATED
            idem_key.save()

            # 3. Trigger Async Processing (Inside the logical boundary)
            process_payout.delay(payout.id)

            return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_payouts(request):
     merchant = Merchant.objects.first()
     payouts = Payout.objects.filter(merchant=merchant).order_by('-created_at')
     data = [
         {
             "id": p.id,
             "amount_paise": p.amount_paise,
             "status": p.status,
             "created_at": p.created_at.isoformat(),
             "bank_account_id": p.bank_account_id
         } for p in payouts
     ]
     return Response({"payouts": data})

@api_view(['GET'])
def get_ledger(request):
     merchant = Merchant.objects.first()
     entries = LedgerEntry.objects.filter(merchant=merchant).order_by('-created_at')
     data = [
         {
             "id": e.id,
             "type": e.type,
             "amount_paise": e.amount_paise,
             "reference_id": e.reference_id,
             "created_at": e.created_at.isoformat()
         } for e in entries
     ]
     return Response({"ledger": data})
