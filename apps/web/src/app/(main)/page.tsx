import { BookOpen, PenLine } from "lucide-react";

import { Button } from "@storynest/ui/components/button";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 py-4 sm:py-10">
      <section className="flex flex-col items-start gap-5">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Nơi những câu chuyện được viết và được đọc.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          Khám phá truyện mới, theo dõi tác giả yêu thích và bắt đầu đăng chương đầu tiên của bạn.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">
            <BookOpen /> Khám phá truyện
          </Button>
          <Button size="lg" variant="outline">
            <PenLine /> Bắt đầu viết
          </Button>
        </div>
      </section>

      <section aria-labelledby="reader-preview" className="rounded-xl border bg-card p-5 text-card-foreground sm:p-8">
        <h2 id="reader-preview" className="mb-4 text-sm font-medium text-muted-foreground">
          Giao diện đọc
        </h2>
        <article className="reader-prose mx-auto">
          <h3 className="mb-3 text-xl font-semibold">Chương 12</h3>
          <p>
            Ánh chiều tràn qua căn phòng yên tĩnh. Cô mở lá thư thêm một lần nữa, và lần này, những dòng chữ không còn
            xa lạ như trước.
          </p>
        </article>
      </section>
    </div>
  );
}
