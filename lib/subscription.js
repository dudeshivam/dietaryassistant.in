export const PREMIUM_PLAN = {
  name: "Premium",
  price: 99,
  amountInPaise: 9900,
  currency: "INR",
  interval: "month",
  trialDays: 30
};

export function addDays(value, days) {
  const date = value ? new Date(value) : new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function getInitialTrialFields(now = new Date()) {
  const trialStart = new Date(now);
  const trialEnd = addDays(trialStart, PREMIUM_PLAN.trialDays);

  return {
    subscription_status: "trial",
    trial_start_date: trialStart.toISOString(),
    trial_end_date: trialEnd.toISOString()
  };
}

export function getPremiumSubscriptionFields(now = new Date()) {
  const subscriptionStart = new Date(now);
  const subscriptionEnd = addDays(subscriptionStart, 30);

  return {
    subscription_status: "premium",
    subscription_start: subscriptionStart.toISOString(),
    subscription_end: subscriptionEnd.toISOString()
  };
}

export function getSubscriptionState(profile, now = new Date()) {
  const currentDate = new Date(now);
  const status = profile?.subscription_status || profile?.plan_status || "free";
  const trialEnd = profile?.trial_end_date ? new Date(profile.trial_end_date) : null;
  const subscriptionEnd = profile?.subscription_end ? new Date(profile.subscription_end) : null;

  if (status === "premium") {
    const isActive = !subscriptionEnd || subscriptionEnd >= currentDate;
    return {
      status: isActive ? "premium" : "expired",
      hasPremiumAccess: isActive,
      trialDaysLeft: 0,
      subscriptionDaysLeft: subscriptionEnd ? Math.max(Math.ceil((subscriptionEnd - currentDate) / 86400000), 0) : 30,
      shouldExpire: !isActive
    };
  }

  if (status === "trial") {
    const isActive = trialEnd && trialEnd >= currentDate;
    const trialDaysLeft = trialEnd ? Math.max(Math.ceil((trialEnd - currentDate) / 86400000), 0) : 0;

    return {
      status: isActive ? "trial" : "expired",
      hasPremiumAccess: Boolean(isActive),
      trialDaysLeft,
      subscriptionDaysLeft: 0,
      shouldExpire: !isActive
    };
  }

  return {
    status,
    hasPremiumAccess: false,
    trialDaysLeft: 0,
    subscriptionDaysLeft: 0,
    shouldExpire: false
  };
}

export function getSubscriptionNotice(profile, now = new Date()) {
  const state = getSubscriptionState(profile, now);

  if (state.status === "trial" && state.trialDaysLeft <= 3) {
    return `Your free trial ends in ${state.trialDaysLeft || 0} day${state.trialDaysLeft === 1 ? "" : "s"}. Upgrade to keep premium access.`;
  }

  if (state.status === "expired") {
    return "Your premium access has expired. Upgrade to Premium to continue.";
  }

  if (state.status === "free") {
    return "Upgrade to Premium to continue.";
  }

  return "";
}
