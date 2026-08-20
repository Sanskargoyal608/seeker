import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/axios';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/authSlice';

export default function EarningsScreen() {
  const user = useSelector(selectUser);
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFinancials = async () => {
    try {
      const [earnRes, payRes] = await Promise.all([
        apiClient.get('/api/core/therapist/earnings/'),
        apiClient.get('/api/core/therapist/payouts/')
      ]);
      setEarnings(earnRes.data || []);
      setPayouts(payRes.data || []);
    } catch (err) {
      console.log('Finance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const handleWithdraw = async () => {
    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.net_amount), 0);
    const totalPayouts = payouts.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
    const available = totalEarnings - totalPayouts;

    if (available <= 0) {
      Alert.alert('Notice', 'No available funds to withdraw.');
      return;
    }

    try {
      await apiClient.post('/api/core/therapist/payouts/', { total_amount: available });
      Alert.alert('Success', 'Withdrawal processed successfully. Funds will be deposited shortly.');
      fetchFinancials();
    } catch (err) {
      Alert.alert('Error', 'Failed to process withdrawal.');
    }
  };

  const renderTransaction = ({ item }) => {
    // If it has net_amount, it's an earning. If it has total_amount, it's a payout.
    const isEarning = item.net_amount !== undefined;
    const amount = isEarning ? item.net_amount : item.total_amount;
    const title = isEarning ? `Session #${item.session}` : 'Withdrawal';
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconBox, { backgroundColor: isEarning ? COLORS.successLight : COLORS.warningLight }]}>
          <Ionicons name={isEarning ? 'arrow-down' : 'arrow-up'} size={20} color={isEarning ? COLORS.success : COLORS.warning} />
        </View>
        <View style={styles.tInfo}>
          <Text style={styles.tTitle}>{title}</Text>
          <Text style={styles.tDate}>{date}</Text>
        </View>
        <Text style={[styles.tAmount, { color: isEarning ? COLORS.success : COLORS.text }]}>
          {isEarning ? '+' : '-'}${parseFloat(amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.net_amount), 0);
  const totalPayouts = payouts.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
  const availableBalance = totalEarnings - totalPayouts;

  const combined = [...earnings, ...payouts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings & Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>${availableBalance.toFixed(2)}</Text>
        <Pressable style={styles.withdrawBtn} onPress={handleWithdraw}>
          <Text style={styles.withdrawBtnText}>Withdraw Funds</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Transaction History</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={combined}
          keyExtractor={(item) => (item.net_amount !== undefined ? `e_${item.id}` : `p_${item.id}`)}
          renderItem={renderTransaction}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.outlineVariant} />
              <Text style={styles.emptyTitle}>No Transactions</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  headerTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text },
  balanceCard: {
    margin: SPACING.md,
    padding: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  balanceLabel: { fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm },
  balanceAmount: { fontFamily: FONTS.bold, color: COLORS.white, fontSize: 36, marginVertical: SPACING.sm },
  withdrawBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  withdrawBtnText: { fontFamily: FONTS.semiBold, color: COLORS.primary },
  listHeader: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  listTitle: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.text },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: SPACING.sm },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  tInfo: { flex: 1 },
  tTitle: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.text },
  tDate: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tAmount: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md },
  emptyWrap: { alignItems: 'center', marginTop: SPACING.xl },
  emptyTitle: { fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: SPACING.sm }
});
