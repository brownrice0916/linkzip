import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onReorder?: (links: CustomLink[]) => void;
  onBlockSelect?: (id: string) => void;
}

function SortableBlock({ id, children, onSelect }: { id: string; children: ReactNode; onSelect?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const fixedSizeTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const isHandleEvent = (target: EventTarget) => (target as Element).closest('[data-drag-handle], .cursor-grab');

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isHandleEvent(event.target)) return;
    listeners?.onMouseDown?.(event);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!isHandleEvent(event.target)) return;
    listeners?.onTouchStart?.(event);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (target !== event.currentTarget && !target.closest('[data-drag-handle], .cursor-grab')) return;
    listeners?.onKeyDown?.(event);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      data-sortable-block
      data-dragging={isDragging ? 'true' : 'false'}
      onClickCapture={(event) => {
        const target = event.target as Element;
        if (target.closest('button, input, textarea, select, a, [data-no-preview-focus]')) return;
        onSelect?.(id);
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      style={{
        transform: CSS.Transform.toString(fixedSizeTransform),
        transition,
        position: 'relative',
        width: '100%',
        transformOrigin: 'center center',
        zIndex: isDragging ? 80 : undefined,
        opacity: isDragging ? 0.96 : 1,
        filter: isDragging ? 'drop-shadow(0 18px 24px rgba(15, 23, 42, 0.22))' : undefined,
        touchAction: 'pan-y pinch-zoom',
        willChange: isDragging ? 'transform' : undefined,
      }}
      className={isDragging ? 'cursor-grabbing' : 'transition-[filter,opacity,transform] duration-200'}
    >
      {children}
    </div>
  );
}

export function BlockList({ links, onReorder, onBlockSelect, ...renderers }: BlockListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!activeId) return;
    const previousUserSelect = document.body.style.userSelect;
    const previousWebkitUserSelect = document.body.style.webkitUserSelect;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.webkitUserSelect = previousWebkitUserSelect;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [activeId]);

  const renderBlock = (block: CustomLink) => {
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
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(links, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={{ threshold: { x: 0, y: 0.18 }, acceleration: 12, interval: 5 }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={links.map((link) => link.id)} strategy={verticalListSortingStrategy}>
        {links.map((block) => (
          <SortableBlock key={block.id} id={block.id} onSelect={onBlockSelect}>
            {renderBlock(block)}
          </SortableBlock>
        ))}
      </SortableContext>
      <span className="sr-only" aria-live="polite">
        {activeId ? '블록 이동 중' : ''}
      </span>
    </DndContext>
  );
}
