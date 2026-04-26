from django.urls import path
from .views import get_balance, create_payout, get_payouts, get_ledger

urlpatterns = [
    path('balance/', get_balance, name='get_balance'),
    path('payouts/', create_payout, name='create_payout'),
    path('payouts/all/', get_payouts, name='get_payouts'),
    path('ledger/', get_ledger, name='get_ledger'),
]
