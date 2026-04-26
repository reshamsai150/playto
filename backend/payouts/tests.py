import threading
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import Merchant, LedgerEntry, Payout, IdempotencyKey
from django.db import connection

class BasePayoutTestCase(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.merchant = Merchant.objects.create(name="Test Merchant")
        
        # Credit 100 rupees (10000 paise)
        LedgerEntry.objects.create(
            merchant=self.merchant,
            type='credit',
            amount_paise=10000,
            reference_id='initial_deposit'
        )
        self.payout_url = reverse('create_payout')


class PayoutIdempotencyTests(BasePayoutTestCase):
    
    def test_idempotency_prevents_duplicate_payouts(self):
        """
        Test 2: Idempotency
        Send same request twice
        Ensure:
        - Same response returned
        - Only one payout created
        """
        idempotency_key = "idem_key_12345"
        payload = {
            "amount_paise": 5000,
            "bank_account_id": "bank_abc"
        }
        
        # Initial request
        response1 = self.client.post(
            self.payout_url,
            data=payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second request with the same idempotency key
        response2 = self.client.post(
            self.payout_url,
            data=payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )
        
        # Responses should be completely identical
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response1.json(), response2.json())
        
        # Only ONE payout should be created in DB
        self.assertEqual(Payout.objects.filter(idempotency_key=idempotency_key).count(), 1)


class PayoutConcurrencyTests(BasePayoutTestCase):

    def test_concurrency_prevents_overdraft(self):
        """
        Test 1: Concurrency
        Simulate parallel payout requests
        Balance = 100. Two requests of 60.
        Ensure:
        - Only one succeeds
        - No overdraft
        """
        # Close connection to allow threads to open their own connections
        connection.close()

        results = []
        
        def make_request(idx):
            payload = {
                "amount_paise": 6000,
                "bank_account_id": f"bank_concurrency_{idx}"
            }
            # Distinct idempotency keys to simulate two distinct requests
            client = APIClient()
            response = client.post(
                self.payout_url,
                data=payload,
                format='json',
                HTTP_IDEMPOTENCY_KEY=f"concurrency_key_{idx}"
            )
            results.append(response.status_code)
            connection.close()

        threads = []
        for i in range(2):
            thread = threading.Thread(target=make_request, args=(i,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # One should succeed (201) and one should fail due to insufficient balance (400)
        self.assertIn(status.HTTP_201_CREATED, results)
        self.assertIn(status.HTTP_400_BAD_REQUEST, results)
        
        # Ensure only 1 payout is created
        payouts = Payout.objects.filter(amount_paise=6000)
        self.assertEqual(payouts.count(), 1)
