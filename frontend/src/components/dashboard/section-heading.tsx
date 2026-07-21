type SectionHeadingProps = {
  index: string;
  title: string;
  description?: string;
};

/** Quiet section label for the war room — display title, no hairline chrome. */
export function SectionHeading({ index, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-5 lg:mb-6">
      <div className="flex items-baseline gap-3.5">
        <h2 className="font-display text-3xl tracking-tight text-[var(--wr-text)] lg:text-4xl">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--wr-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
