import { HttpStatus } from "@nestjs/common";

declare module "express" {
  export interface Response {
    /**
     * Redireciona de volta para a rota anterior.
     * @param status Status HTTP opcional (padrão: SEE_OTHER)
     */
    redirectBack(status?: HttpStatus): void;
  }
}
