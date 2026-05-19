export abstract class TransactionManager<TransactionCtx = unknown> {
  public abstract runInTransaction<T>(work: () => Promise<T>): Promise<T>;

  public abstract getTx(): TransactionCtx | undefined;

  public abstract rollback();
}
