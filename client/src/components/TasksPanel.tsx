import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckSquare, Square, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Task } from "@shared/schema";

export function TasksPanel() {
  const [newTask, setNewTask] = useState("");

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tasks");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/tasks", { title, completed: false, sortOrder: tasks.length });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewTask("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="panel-card p-4 h-full flex flex-col" data-testid="tasks-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </p>
          {pending.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/20 text-primary tabular-nums">
              {pending.length}
            </span>
          )}
        </div>
      </div>

      {/* Add task */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newTask.trim()) addMutation.mutate(newTask.trim());
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
          data-testid="input-new-task"
        />
        <button
          type="submit"
          className="px-2 py-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          data-testid="button-add-task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {pending.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/30 transition-colors group"
            data-testid={`task-item-${task.id}`}
          >
            <button
              onClick={() => toggleMutation.mutate({ id: task.id, completed: true })}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <Square className="w-4 h-4" />
            </button>
            <p className="flex-1 text-sm leading-snug">{task.title}</p>
            <button
              onClick={() => deleteMutation.mutate(task.id)}
              className="text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {completed.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider pt-2 mt-2 border-t border-border">
              Completed
            </p>
            {completed.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 py-1.5 px-1 rounded group"
                data-testid={`task-done-${task.id}`}
              >
                <button
                  onClick={() => toggleMutation.mutate({ id: task.id, completed: false })}
                  className="text-positive shrink-0"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <p className="flex-1 text-sm leading-snug line-through text-muted-foreground">
                  {task.title}
                </p>
                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </>
        )}
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">Nothing on the list yet.</p>
        )}
      </div>
    </div>
  );
}
