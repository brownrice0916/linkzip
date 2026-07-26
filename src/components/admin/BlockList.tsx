import type { ReactNode } from 'react';
import type { CustomLink } from '../../store/useStore';

interface BlockListProps {
  links: CustomLink[];
  renderLink: (link: CustomLink) => ReactNode;
  renderCollection: (link: CustomLink) => ReactNode;
  renderDonation: (link: CustomLink) => ReactNode;
  renderFile: (link: CustomLink) => ReactNode;
  renderSocial: (link: CustomLink) => ReactNode;
  renderReservation: (link: CustomLink) => ReactNode;
  renderNotice: (link: CustomLink) => ReactNode;
  renderCustomerInfo: (link: CustomLink) => ReactNode;
  renderSales: (link: CustomLink) => ReactNode;
  renderAffiliateProduct: (link: CustomLink) => ReactNode;
  renderMap: (link: CustomLink) => ReactNode;
}

export function BlockList({ links, ...renderers }: BlockListProps) {
  return links.map((block) => {
    switch (block.type) {
      case 'collection': return renderers.renderCollection(block);
      case 'donation': return renderers.renderDonation(block);
      case 'file': return renderers.renderFile(block);
      case 'sns': return renderers.renderSocial(block);
      case 'reservation': return renderers.renderReservation(block);
      case 'notice': return renderers.renderNotice(block);
      case 'customer_info': return renderers.renderCustomerInfo(block);
      case 'sales': return renderers.renderSales(block);
      case 'affiliate_product': return renderers.renderAffiliateProduct(block);
      case 'map': return renderers.renderMap(block);
      default: return renderers.renderLink(block);
    }
  });
}
