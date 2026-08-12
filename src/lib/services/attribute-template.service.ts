import api from "@/shared/api";
import type { AttributeTemplate } from "@/types";

interface CreateAttributeTemplateRequest {
  categoryId: string;
  attributeKeys: string[];
}

interface ConfigureFilterableRequest {
  attributeKey: string;
  filterable: boolean;
}

export const attributeTemplateService = {
  create(body: CreateAttributeTemplateRequest) {
    return api.post<AttributeTemplate>("/catalog/attribute-templates", body);
  },
  configureFilterable(templateId: string, body: ConfigureFilterableRequest) {
    return api.put<AttributeTemplate>(
      `/catalog/attribute-templates/${templateId}/filterable`,
      body,
    );
  },
  get(templateId: string) {
    return api.get<AttributeTemplate>(
      `/catalog/attribute-templates/${templateId}`,
    );
  },
  getByCategory(categoryId: string) {
    return api.get<AttributeTemplate>("/catalog/attribute-templates", {
      query: { categoryId },
    });
  },
};
