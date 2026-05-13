export const productFieldMapping = {
  title: { shopifyType: "productField", field: "title" },
  handle: { shopifyType: "productField", field: "handle" },
  body_html: { shopifyType: "productField", field: "descriptionHtml" },
  vendor: { shopifyType: "productField", field: "vendor" },
  tags: { shopifyType: "productField", field: "tags" },
  status: { shopifyType: "productField", field: "status" },
} as const;

export const inductorVariantFieldMapping = {
  price: { shopifyType: "variantField", field: "price" },
  barcode: { shopifyType: "variantField", field: "barcode" },
  inductance: { shopifyType: "metafield", namespace: "custom", key: "inductance" },
  rated_current: {
    shopifyType: "metafield",
    namespace: "custom",
    key: "rated_current",
  },
  dcr_max: { shopifyType: "metafield", namespace: "custom", key: "dcr_max" },
  height: { shopifyType: "metafield", namespace: "custom", key: "height" },
  width: { shopifyType: "metafield", namespace: "custom", key: "width" },
  length: { shopifyType: "metafield", namespace: "custom", key: "length" },
  operating_temp_range: {
    shopifyType: "metafield",
    namespace: "custom",
    key: "operating_temp_range",
  },
  shielded: { shopifyType: "metafield", namespace: "custom", key: "shielded" },
  mounting_type: {
    shopifyType: "metafield",
    namespace: "custom",
    key: "mounting_type",
  },
} as const;
