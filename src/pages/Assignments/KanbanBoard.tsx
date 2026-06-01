import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Assignment } from '@/store/useAppStore'

const COLUMNS: Record<string, { label: string; color: string }> = {
  todo:        { label: 'لم يبدأ بعد',  color: 'bg-muted/60 border border-border/80' },
  in_progress: { label: 'قيد العمل',    color: 'bg-primary/5 border border-primary/20'  },
  done:        { label: 'مكتمل ✓',      color: 'bg-green-500/5 border border-green-500/20' },
}

export function KanbanBoard({ assignments, onUpdate }: {
  assignments: Assignment[]
  onUpdate: () => void
}) {
  const [cols, setCols] = useState<Record<string, Assignment[]>>({ todo: [], in_progress: [], done: [] })

  useEffect(() => {
    const grouped: Record<string, Assignment[]> = { todo: [], in_progress: [], done: [] }
    for (const a of assignments) {
      const col = a.kanban_column || 'todo'
      if (!grouped[col]) grouped[col] = []
      grouped[col].push(a)
    }
    for (const col of Object.keys(grouped)) {
      grouped[col].sort((a, b) => (a.kanban_order ?? 0) - (b.kanban_order ?? 0))
    }
    setCols(grouped)
  }, [assignments])

  async function onDragEnd(result: DropResult) {
    const { source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const newCols = { ...cols }
    const srcList = Array.from(newCols[source.droppableId] || [])
    const dstList = source.droppableId === destination.droppableId
      ? srcList
      : Array.from(newCols[destination.droppableId] || [])

    const [moved] = srcList.splice(source.index, 1)
    if (!moved) return
    
    // Update temporary assignment status to match column
    moved.kanban_column = destination.droppableId
    dstList.splice(destination.index, 0, moved)

    newCols[source.droppableId] = srcList
    newCols[destination.droppableId] = dstList
    setCols(newCols)

    // Persist reorder to SQLite
    const updates: { id: string; column: string; order: number }[] = []
    for (const [colId, items] of Object.entries(newCols)) {
      items.forEach((item, i) => updates.push({ id: item.id, column: colId, order: i }))
    }
    
    try {
      await window.electronAPI.db_assignments_reorder(updates)
      onUpdate()
    } catch (err) {
      console.error('Failed to save Kanban reorder', err)
    }
  }

  return (
    <div className="p-1 select-none" dir="rtl">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(COLUMNS).map(([colId, meta]) => (
            <div key={colId} className={`rounded-2xl p-4 ${meta.color} min-h-[450px] flex flex-col`}>

              {/* Column header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="font-bold text-sm text-foreground">{meta.label}</h3>
                <Badge variant="outline" className="text-xs font-bold border-primary/20 text-primary">
                  {cols[colId]?.length ?? 0}
                </Badge>
              </div>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[300px] transition-colors rounded-xl p-1 space-y-3 ${
                      snapshot.isDraggingOver ? 'bg-card/40' : ''
                    }`}
                  >
                    {(cols[colId] ?? []).map((item, i) => (
                      <Draggable key={item.id} draggableId={item.id} index={i}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                          >
                            <Card className={`cursor-grab active:cursor-grabbing border shadow-sm transition-all hover:shadow-md bg-card ${
                              snap.isDragging ? 'shadow-xl rotate-1 border-primary scale-[1.02]' : ''
                            }`}>
                              <CardContent className="p-3.5 space-y-2">
                                <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
                                <div className="flex justify-between items-center pt-1.5 border-t border-border/60">
                                  {item.due_date ? (
                                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                      📅 {new Date(item.due_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  {item.grade ? (
                                    <Badge variant="secondary" className="text-[9px] font-extrabold">
                                      الدرجة: {item.grade}
                                    </Badge>
                                  ) : (
                                    <span />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
