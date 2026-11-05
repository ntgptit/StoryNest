import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./form.tsx";
import { FormErrorSummary } from "./form-error-summary.tsx";
import { Input } from "./input.tsx";

afterEach(cleanup);

type Values = { title: string; slug: string };

function TestForm() {
  const form = useForm<Values>({ defaultValues: { title: "", slug: "" } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)} noValidate>
        <FormErrorSummary title={(count) => `${count} to fix`} />
        {(["title", "slug"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            rules={{ required: `${name} is required` }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{name === "title" ? "Story title" : "Link"}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe("FormErrorSummary", () => {
  it("renders nothing before the first submit", () => {
    render(<TestForm />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("lists every invalid field by its label after a submit, and jumps to the one pressed", async () => {
    render(<TestForm />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const summary = await screen.findByRole("alert");
    expect(summary.textContent).toContain("2 to fix");
    const linkButton = await within(summary).findByRole("button", { name: "Link" });
    expect(within(summary).getByRole("button", { name: "Story title" })).toBeTruthy();

    act(() => linkButton.click());
    expect(document.activeElement).toBe(screen.getByLabelText("Link"));
  });

  it("counts down as fields are fixed and disappears when nothing is left", async () => {
    render(<TestForm />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Story title"), { target: { value: "A title" } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("1 to fix"));
    fireEvent.change(screen.getByLabelText("Link"), { target: { value: "a-title" } });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("shakes the invalid controls on submit, not while typing", async () => {
    render(<TestForm />);
    const title = screen.getByLabelText("Story title");
    expect(title.getAttribute("data-field")).toBe("title");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(title.className).toContain("animate-field-shake"));
    fireEvent.animationEnd(title);
    expect(title.className).not.toContain("animate-field-shake");
    // Fix it, then break it again by typing: invalid again, but no submit, so no shake.
    fireEvent.change(title, { target: { value: "x" } });
    fireEvent.change(title, { target: { value: "" } });
    await waitFor(() => expect(title.getAttribute("aria-invalid")).toBe("true"));
    expect(title.className).not.toContain("animate-field-shake");
  });
});
