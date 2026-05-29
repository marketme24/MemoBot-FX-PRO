import React, { createContext, useContext, useState, ReactNode } from "react";

export interface UserSubscription {
  id: string;
  userId: string;
  plan: "free" | "pro" | "elite";
  status: "active" | "inactive" | "canceled" | "past_due" | "pending";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface SubscriptionContextType {
  subscription: UserSubscription | null;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>({
    id: "sub_1",
    userId: "user_1",
    plan: "pro",
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  const [isLoading, setIsLoading] = useState(false);

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}