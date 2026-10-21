export type SupportStatus = "creating" | "pending" | "paid" | "held" | "failed";

export interface SupportTier {
  key: string;
  label: string;
  amount: string;
  currency: string;
}

export interface SupportOrder {
  id: number;
  reference: string;
  tokenHash: string;
  tier: string;
  amount: string;
  currency: string;
  status: SupportStatus;
  checkoutId: string | null;
  checkoutUrl: string | null;
  checkoutStatus: string | null;
  expiresAt: Date | null;
  idempotencyKey: string;
  chargeId: string | null;
  customerEmail: string | null;
  heldReason: string | null;
  lastEventId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewSupportOrder {
  reference: string;
  tokenHash: string;
  tier: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
}

export interface CheckoutDetails {
  checkoutId: string;
  checkoutUrl: string;
  checkoutStatus: string;
  expiresAt: Date | null;
}

export interface FulfilInput {
  eventId: string;
  eventType: string;
  orderReference: string;
  eventCreatedAt: Date | null;
  chargeId: string | null;
  customerEmail: string | null;
  checkoutStatus: string;
}

export interface HoldInput extends FulfilInput {
  reason: string;
}

export type FulfilResult = "fulfilled" | "duplicate" | "already-paid" | "held";

export interface SupportStore {
  createOrder(input: NewSupportOrder): Promise<SupportOrder>;
  findByReference(reference: string): Promise<SupportOrder | null>;
  findByCheckoutId(checkoutId: string): Promise<SupportOrder | null>;
  findByTokenHash(tokenHash: string): Promise<SupportOrder | null>;
  attachCheckout(orderId: number, details: CheckoutDetails): Promise<SupportOrder>;
  markFailed(orderId: number, reason: string): Promise<void>;
  fulfil(orderId: number, input: FulfilInput): Promise<FulfilResult>;
  hold(orderId: number, input: HoldInput): Promise<FulfilResult>;
}

export interface PublicSupportOrder {
  reference: string;
  tier: string;
  amount: string;
  currency: string;
  status: SupportStatus;
  checkout_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface BachsCheckoutCreateInput {
  pricing: { currency: string; amount: string };
  reference: string;
  metadata?: Record<string, string>;
}

export interface BachsCheckoutCreated {
  checkout_id: string;
  checkout_url: string;
  status: string;
  expires_at: string;
  created_at: string;
  reference: string | null;
}

export interface BachsCheckout {
  checkout_id: string;
  status: string;
  amount?: string;
  currency?: string;
  reference?: string | null;
  payment_status?: string;
  customer?: { email?: string | null } | null;
  customer_details?: { email?: string | null } | null;
  charge_id?: string | null;
}

export interface BachsClientLike {
  checkoutSessions: {
    create(
      input: BachsCheckoutCreateInput,
      options?: { idempotencyKey?: string }
    ): Promise<BachsCheckoutCreated>;
    get(checkoutId: string): Promise<BachsCheckout>;
  };
}

export interface SupportDeps {
  store: SupportStore;
  bachs: BachsClientLike;
}

export interface CheckoutResponse {
  token: string;
  pending: boolean;
  order: PublicSupportOrder;
}
