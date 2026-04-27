from rest_framework import serializers
from .models import Payout, Merchant, LedgerEntry

class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = '__all__'
        read_only_fields = ('id', 'status', 'attempt_count', 'created_at', 'updated_at', 'merchant', 'idempotency_key')
