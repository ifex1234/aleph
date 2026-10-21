export class SupportError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SupportError";
    this.status = status;
  }
}
