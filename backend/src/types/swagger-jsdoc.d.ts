declare module "swagger-jsdoc" {
    import { OAS3Definition, OAS3Options } from "swagger-jsdoc";
    export default function swaggerJsdoc(options: OAS3Options): object;
    export { OAS3Definition, OAS3Options };
  }