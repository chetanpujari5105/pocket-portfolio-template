import { createCn } from "cn/engine";

import tables from "./cn-tables";

/**
 * clsx + Tailwind conflict merging, bound to tables compiled from this project's own classes
 * (`npm run cn`, run before every build) so the bundle only carries the class groups we use.
 * Only for components whose `className` prop overrides their own classes; it stays out of the
 * home screen's initial bundle.
 */
export const cnMerge = createCn(tables);
