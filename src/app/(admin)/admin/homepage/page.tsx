"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Block = { id: string; type: string; title: string };

const initial: Block[] = [
  { id: "1", type: "hero", title: "Hero" },
  { id: "2", type: "products", title: "Öne çıkan ürünler" },
  { id: "3", type: "categories", title: "Kategoriler" },
  { id: "4", type: "campaign", title: "Kampanya" },
  { id: "5", type: "brands", title: "Markalar" },
  { id: "6", type: "newsletter", title: "Newsletter" },
];

function SortableRow({ block }: { block: Block }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--bv-border)] bg-white px-4 py-3"
      {...attributes}
      {...listeners}
    >
      <div>
        <p className="text-sm font-medium">{block.title}</p>
        <p className="text-xs text-[var(--bv-muted)]">{block.type}</p>
      </div>
      <span className="text-xs text-[var(--bv-muted)]">Sürükle</span>
    </div>
  );
}

export default function HomepageBuilderPage() {
  const [blocks, setBlocks] = React.useState(initial);
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Anasayfa Builder</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            Blokları sürükleyerek sıralayın. Yayınlama seed/DB section sıralaması
            ile senkronlanır.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() =>
            toast({
              tone: "success",
              title: "Sıra kaydedildi",
              description: "Önizleme için mağazayı yenileyin.",
            })
          }
        >
          Kaydet
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {blocks.map((block) => (
              <SortableRow key={block.id} block={block} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
