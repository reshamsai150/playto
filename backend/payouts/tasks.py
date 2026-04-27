import random
import time
from celery import shared_task
from django.db import transaction
from .models import Payout, LedgerEntry

@shared_task(bind=True, max_retries=3)
def process_payout(self, payout_id):
    try:
        with transaction.atomic():
            payout = Payout.objects.select_for_update().get(id=payout_id)
            if payout.status != 'pending':
                return "Not pending, skipping"
                
            # Allowed transition: pending -> processing
            payout.status = 'processing'
            payout.save()
        
        # Simulate work (outside the lock)
        time.sleep(2)
        
        r = random.random()
        
        if r < 0.70:
            # 70% completed
            with transaction.atomic():
                payout = Payout.objects.select_for_update().get(id=payout_id)
                if payout.status == 'processing':
                    payout.status = 'completed'
                    payout.save()
            return "Completed"
            
        elif r < 0.90:
            # 20% failed -> Must return funds atomically
            with transaction.atomic():
                payout = Payout.objects.select_for_update().get(id=payout_id)
                if payout.status == 'processing':
                    payout.status = 'failed'
                    payout.save()
                    
                    # Return funds
                    LedgerEntry.objects.create(
                        merchant=payout.merchant,
                        type='credit',
                        amount_paise=payout.amount_paise,
                        reference_id=f"refund_payout_{payout.id}"
                    )
            return "Failed and Refunded"
            
        else:
            # 10% stuck
            # Simulate a stuck task by throwing Exception
            # This triggers Celery retry logic
            raise Exception("Simulated Stuck / Network Timeout")
            
    except Exception as e:
        # Retry with exponential backoff
        # self.request.retries is the attempt count
        payout.attempt_count = self.request.retries + 1
        payout.save()
        
        if self.request.retries >= self.max_retries:
            # Mark as failed if max retries exceeded
            with transaction.atomic():
                p = Payout.objects.select_for_update().get(id=payout_id)
                if p.status == 'processing':
                    p.status = 'failed'
                    p.save()
                    # Refund logic
                    LedgerEntry.objects.create(
                        merchant=p.merchant,
                        type='credit',
                        amount_paise=p.amount_paise,
                        reference_id=f"refund_payout_{p.id}"
                    )
            return "Max retries reached, marked as failed"
            
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
