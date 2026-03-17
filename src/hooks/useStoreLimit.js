import { useState } from "react";
import { supabase } from "../supabaseClient";
import { callEdgeFunction } from "../utils/callEdgeFunction";

export function useStoreLimit(orgId) {
  const [upgradeInfo, setUpgradeInfo] = useState(null);
  const [saving, setSaving] = useState(false);

  async function checkBeforeCreate() {
    if (!orgId) return true;

    const [subRes, countRes, pricingRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, max_stores, price_per_store, current_period_end")
        .eq("organization_id", orgId)
        .single(),
      supabase
        .from("stores")
        .select("id", { count: "exact" })
        .eq("organization_id", orgId)
        .eq("active", true),
      supabase.rpc("get_current_pricing"),
    ]);

    const sub = subRes.data;
    const maxStores = sub?.max_stores ?? null;
    const storeCount = countRes.count ?? 0;

    if (maxStores !== null && storeCount >= maxStores) {
      const pricing = Array.isArray(pricingRes.data) ? pricingRes.data[0] : pricingRes.data;
      const pricePerStore = pricing ? Number(pricing.price_per_store) : Number(sub?.price_per_store || 0);

      setUpgradeInfo({
        maxStores,
        storeCount,
        subscriptionId: sub?.id,
        currentMaxStores: sub?.max_stores,
        pricePerStore,
        periodEnd: sub?.current_period_end,
      });
      return false;
    }
    return true;
  }

  async function addSlots(qty) {
    if (!upgradeInfo?.subscriptionId || !qty || qty < 1) return false;
    setSaving(true);
    try {
      await callEdgeFunction("asaas-update-subscription", {
        subscriptionId: upgradeInfo.subscriptionId,
        addStores: qty,
      });
      setSaving(false);
      setUpgradeInfo(null);
      return true;
    } catch (err) {
      console.error("addSlots error:", err);
      setSaving(false);
      return false;
    }
  }

  return { upgradeInfo, setUpgradeInfo, saving, checkBeforeCreate, addSlots };
}
