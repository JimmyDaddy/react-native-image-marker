
export class MarkerError extends Error {
  private errorCode: string;
  private errMsg: string;

  constructor(errorCode: string, errMsg: string) {
    super();
    this.errorCode = errorCode;
    this.errMsg = errMsg;
  }

  getErrorCode(): string {
    return this.errorCode;
  }

  getErrMsg(): string {
    return this.errMsg;
  }
}
;