import { HttpException, HttpStatus } from "@nestjs/common";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class ResourceNotFoundException extends HttpException {
  public constructor(public error: ResourceNotFoundError) {
    super(error, HttpStatus.NOT_FOUND);
  }
}
