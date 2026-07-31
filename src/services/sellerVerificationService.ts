import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

export type SellerVerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type SellerType = 'business' | 'individual_creator';

export interface SellerVerificationApplication {
  sellerType: SellerType;
  businessRegistrationNumber: string;
  businessName: string;
  representativeName: string;
  businessAddress: string;
  contactPhone: string;
  contactEmail: string;
  mailOrderRegistrationNumber: string;
  mailOrderExemptionReason: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  shippingPolicy: string;
  prohibitedGoodsAgreed: boolean;
  privacyTermsAgreed: boolean;
  sellerTermsAgreed: boolean;
  creatorDigitalOnlyAgreed: boolean;
  creatorBusinessTransitionAgreed: boolean;
  creatorTaxResponsibilityAgreed: boolean;
}

export interface SellerVerificationState extends Partial<SellerVerificationApplication> {
  status: SellerVerificationStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string;
}

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(getFunctions(app, 'asia-northeast3'), name);

export async function getSellerVerification(): Promise<SellerVerificationState> {
  const result = await callable<Record<string, never>, SellerVerificationState>('getSellerVerification')({});
  return result.data;
}

export async function submitSellerVerification(application: SellerVerificationApplication): Promise<SellerVerificationState> {
  const result = await callable<SellerVerificationApplication, SellerVerificationState>('submitSellerVerification')(application);
  return result.data;
}
