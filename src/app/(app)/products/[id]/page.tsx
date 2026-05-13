import Link from "next/link";
import { notFound } from "next/navigation";

import { AuditLogPreview } from "@/features/products/components/audit-log-preview";
import { ProductEditForm } from "@/features/products/components/product-edit-form";
import { ProductImagesManager } from "@/features/products/components/product-images-manager";
import { VariantEditor } from "@/features/products/components/variant-editor";
import {
  getProductDetail,
  listAuditLogByProductId,
  listImagesByProductId,
  listVariantsByProductId,
} from "@/features/products/queries";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const [result, variantsResult, auditResult, imagesResult] = await Promise.all([
    getProductDetail(id),
    listVariantsByProductId(id),
    listAuditLogByProductId(id),
    listImagesByProductId(id),
  ]);

  if (!result.product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Link href="/products?family=inductors" className="hover:text-violet-700">
          Products
        </Link>
        <span>/</span>
        <span>{result.product.sku}</span>
      </div>

      <ProductEditForm
        product={result.product}
        source={result.source}
      />
      <ProductImagesManager
        product={result.product}
        images={imagesResult.images}
        source={imagesResult.source}
      />
      <VariantEditor productId={result.product.id} variants={variantsResult.variants} />
      <AuditLogPreview entries={auditResult.entries} source={auditResult.source} />
    </div>
  );
}
