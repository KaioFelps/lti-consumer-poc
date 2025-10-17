export interface ExceptionPresenter<E, R = object> {
  present(exception: E): Promise<R>;
}
