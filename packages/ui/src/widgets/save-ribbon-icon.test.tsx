import { cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SaveRibbonIcon } from "./save-ribbon-icon.tsx";

afterEach(cleanup);

function parts(container: HTMLElement) {
  const root = container.querySelector('[data-slot="save-ribbon"]');
  return {
    root,
    fill: container.querySelector('[data-part="fill"]'),
    burst: container.querySelector('[data-part="burst"]'),
    svg: container.querySelector("svg"),
  };
}

describe("SaveRibbonIcon", () => {
  it("shows a filled ribbon without any animation when it starts saved", () => {
    const { container } = render(<SaveRibbonIcon saved />);
    const { root, fill, burst, svg } = parts(container);
    expect(root?.getAttribute("data-state")).toBe("on");
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(fill).toBeTruthy();
    expect(fill?.getAttribute("class")).not.toContain("animate-ribbon-fill");
    expect(svg?.getAttribute("class")).not.toContain("animate-ribbon-drop");
    expect(burst).toBeNull();
  });

  it("shows only the outline when not saved", () => {
    const { container } = render(<SaveRibbonIcon saved={false} />);
    const { root, fill, burst } = parts(container);
    expect(root?.getAttribute("data-state")).toBe("off");
    expect(fill).toBeNull();
    expect(burst).toBeNull();
  });

  it("plays the pour, drop and burst when it turns on, and drops them again when it turns off", () => {
    const { container, rerender } = render(<SaveRibbonIcon saved={false} />);

    rerender(<SaveRibbonIcon saved />);
    let current = parts(container);
    expect(current.fill?.getAttribute("class")).toContain("animate-ribbon-fill");
    expect(current.svg?.getAttribute("class")).toContain("animate-ribbon-drop");
    // Decorative burst: only rendered visible when motion is allowed.
    expect(current.burst?.getAttribute("class")).toContain("motion-safe:block");
    expect(current.burst?.querySelectorAll(".animate-ribbon-burst")).toHaveLength(8);

    rerender(<SaveRibbonIcon saved={false} />);
    current = parts(container);
    expect(current.fill).toBeNull();
    expect(current.burst).toBeNull();
    expect(current.svg?.getAttribute("class")).not.toContain("animate-ribbon-drop");
  });

  it("replays the animation on every new save by remounting the animated nodes", () => {
    const { container, rerender } = render(<SaveRibbonIcon saved={false} />);
    rerender(<SaveRibbonIcon saved />);
    const firstSvg = parts(container).svg;
    rerender(<SaveRibbonIcon saved={false} />);
    rerender(<SaveRibbonIcon saved />);
    const secondSvg = parts(container).svg;
    expect(secondSvg).not.toBe(firstSvg);
    expect(parts(container).burst).toBeTruthy();
  });

  it("does not animate on mount under StrictMode double rendering", () => {
    const { container } = render(
      <StrictMode>
        <SaveRibbonIcon saved />
      </StrictMode>,
    );
    expect(parts(container).burst).toBeNull();
  });
});
