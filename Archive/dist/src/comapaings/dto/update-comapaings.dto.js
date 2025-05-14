"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateComapaingDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_comapaings_dto_1 = require("./create-comapaings.dto");
class UpdateComapaingDto extends (0, mapped_types_1.PartialType)(create_comapaings_dto_1.CreateComapaingDto) {
}
exports.UpdateComapaingDto = UpdateComapaingDto;
//# sourceMappingURL=update-comapaings.dto.js.map