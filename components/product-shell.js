import Link from "next/link";

export function ProductShell({
  title,
  eyebrow,
  description,
  actions,
  children
}) {
  return (
    <div className="app-shell">
      <header className="topbar topbar--product">
        <Link className="brand" href="/">
          <span className="brand__mark">BR</span>
          <span className="brand__text">Black Rain Academy</span>
        </Link>
        <nav className="topbar__nav" aria-label="Product">
          <Link href="/">Landing</Link>
          <Link href="/lessons/new">Create Lesson</Link>
        </nav>
      </header>

      <main className="product-main">
        <section className="product-hero">
          <div className="scene__inner product-hero__inner">
            <div>
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              <h1 className="product-title">{title}</h1>
              {description ? <p className="product-description">{description}</p> : null}
            </div>
            {actions ? <div className="product-actions">{actions}</div> : null}
          </div>
        </section>
        <section className="scene scene--product">
          <div className="scene__inner">{children}</div>
        </section>
      </main>
    </div>
  );
}
