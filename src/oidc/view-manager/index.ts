export abstract class ViewManager {
  public abstract getView(): string;
  public abstract getRenderData(): Promise<object | undefined>;
}
