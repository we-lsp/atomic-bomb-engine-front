import { describe, it, expect } from "vitest";

import { mount } from "@vue/test-utils";
import mainView from "../mainView.vue";

describe("mainView", () => {
  it("renders properly", () => {
    const wrapper = mount(mainView, { props: { msg: "Hello Vitest" } });
    expect(wrapper.text()).toContain("Hello Vitest");
  });
});
