import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

type Props = {
  onCreate(): void;
  onRestore(): void;
  /** Optional static sample drawing shown above the copy. */
  sample?: ReactNode;
};

export function EmptyState({ onCreate, onRestore, sample }: Props) {
  return (
    <section className={styles.wrap} aria-labelledby="empty-title">
      <div className={styles.sample} aria-hidden>
        {sample}
      </div>
      <h1 id="empty-title" className={styles.title}>
        Sketch your first architecture
      </h1>
      <p className={styles.body}>
        Boards save automatically in this browser. Drag in services, databases and queues, or drop a photo of a paper
        sketch.
      </p>
      <div className={styles.actions}>
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          <Plus size={16} aria-hidden />
          New board
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRestore}>
          Restore from backup
        </button>
      </div>
    </section>
  );
}
