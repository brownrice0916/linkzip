import type { CustomLink, ProductItem, UserProfile } from '../store/useStore';

export type StorefrontProduct = {
  key: string;
  block: CustomLink;
  product: ProductItem;
  productIndex: number;
  image?: string;
  salesType: 'digital_file' | 'product';
  externalPurchaseUrl?: string;
};

export const getStorefrontProducts = (customLinks: CustomLink[]): StorefrontProduct[] =>
  customLinks
    .filter((block) => block.type === 'sales' && block.isVisible !== false)
    .flatMap((block) => (block.salesConfig?.products || []).map((product, productIndex) => ({
      key: `${block.id}:${product.id}`,
      block,
      product,
      productIndex,
      image: block.salesConfig?.image || block.icon,
      salesType: block.salesConfig?.salesType || 'product',
    })));

export const getProfileStorefrontProducts = (
  profile: UserProfile,
  _customLinks: CustomLink[],
): StorefrontProduct[] => {
  if (profile.storefront?.enabled) {
    return (profile.storefront.products || []).map((storeProduct, productIndex) => {
      const product: ProductItem = {
        id: storeProduct.id,
        name: storeProduct.name,
        price: storeProduct.price,
        stock: storeProduct.stock,
        orderNote: storeProduct.description,
        shippingFee: storeProduct.shippingFee,
      };
      const block: CustomLink = {
        id: `store-${storeProduct.id}`,
        type: 'sales',
        title: storeProduct.name,
        isVisible: true,
        salesConfig: {
          salesType: storeProduct.productType || 'product',
          mainText: storeProduct.name,
          description: storeProduct.description || '',
          image: storeProduct.imageUrl,
          products: [product],
          creatorMessage: '구매해주셔서 감사합니다.',
        },
      };
      return {
        key: `store:${storeProduct.id}`,
        block,
        product,
        productIndex,
        image: storeProduct.imageUrl,
        salesType: storeProduct.productType || 'product',
        externalPurchaseUrl: storeProduct.externalPurchaseUrl,
      };
    });
  }
  return [];
};
