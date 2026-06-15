export type RunStatus =
  | "researching"
  | "designing"
  | "generating_copy"
  | "pending_approval"
  | "deploying"
  | "updating"
  | "live"
  | "rejected"
  | "failed";

export type RunType = "new_product" | "copy_refresh";
export type TriggeredBy = "human" | "analyst";
