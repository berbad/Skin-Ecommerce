import { render, fireEvent, waitFor } from "@testing-library/react";
import { test, expect, vi, afterEach } from "vitest";
import AccountSecurityForm from "./AccountSecurityForm";
afterEach(() => vi.unstubAllGlobals());
test("recovery waits for explicit submission and removes the link token from the address bar", async () => {
  window.history.replaceState(
    {},
    "",
    "/reset-password#token=" + "a".repeat(64),
  );
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf" })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "Password updated. Sign in again." }),
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  const { getByLabelText, getByRole } = render(
    <AccountSecurityForm mode="reset" />,
  );
  expect(window.location.hash).toBe("");
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(getByLabelText("New password"), {
    target: { value: "StrongPassword12" },
  });
  fireEvent.click(getByRole("button", { name: "Reset password" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    token: "a".repeat(64),
    password: "StrongPassword12",
  });
  expect(await getByRole("status")).toHaveTextContent("Password updated");
});
