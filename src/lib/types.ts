export type ProductCategory =
  | "Kolye"
  | "Bileklik"
  | "Pin"
  | "Küpe"
  | "Anahtarlık"
  | "Aksesuar";

export type ProductCoatingOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type CouponDiscountType = "percentage" | "fixed";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type OrderStatus =
  | "Beklemede"
  | "Ödeme Alındı"
  | "Sipariş Hazırlanıyor"
  | "Kargoya Verildi"
  | "Tamamlandı";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  material: string;
  image: string;
  images?: string[];
  collection: string;
  finish: string;
  stock: number;
  leadTimeDays: number;
  tags: string[];
  seoKeywords?: string[];
  coatingOptions?: ProductCoatingOption[];
  isNew?: boolean;
  isLimited?: boolean;
};

export type Coupon = {
  id?: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderTotal: number;
  usageLimit?: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  collectionRestriction?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type NewsletterSubscriber = {
  email: string;
  createdAt: string;
};

export type ProductReview = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  productSlug?: string;
  productName?: string;
  orderId?: string;
  rating: number;
  comment: string;
  images: string[];
  status: ReviewStatus;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approved?: boolean;
  title?: string;
  message?: string;
  imageUrl?: string;
};

export type CartItem = {
  itemKey: string;
  productId: string;
  coatingOptionId?: string;
  quantity: number;
};

export type ShippingInfo = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  coatingOptionId?: string;
  coatingName?: string;
  coatingPriceDelta?: number;
};

export type Order = {
  _id?: string;
  userId?: string;
  userEmail?: string;
  items: OrderItem[];
  customerNote?: string;
  couponCode?: string;
  couponDiscountPercent?: number;
  couponDiscountAmount?: number;
  trackingNumber?: string;
  shipping: ShippingInfo;
  status: OrderStatus;
  total: number;
  subtotal?: number;
  shippingFee?: number;
  createdAt: string;
  updatedAt?: string;
  paymentIban?: string;
  paymentIbanId?: string;
  paymentIbanLabel?: string;
  paymentIbanAccountHolder?: string;
  paymentChatStartedAt?: string;
  paymentNotifiedAt?: string;
  paymentVerifiedAt?: string;
  paymentPaidAmount?: number;
  paymentReceiptUrl?: string;
  paymentTransactionRef?: string;
  paymentVerificationNote?: string;
  paymentVerificationSource?: "manual" | "n8n";
  paymentVerificationFailedAt?: string;
  lastPaymentReminderAt?: string;
  paymentReminderCount?: number;
};

export type SupportRequestStatus = "Yeni" | "İnceleniyor" | "Çözüldü";

export type SupportRequestReply = {
  message: string;
  sentAt: string;
  sentByEmail: string;
};

export type SupportRequest = {
  _id?: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  productName: string;
  productVariant?: string;
  subject: string;
  message: string;
  replies?: SupportRequestReply[];
  lastReplyAt?: string;
  replyCount?: number;
  status: SupportRequestStatus;
  createdAt: string;
  updatedAt?: string;
};
