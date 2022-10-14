// Copyright 2022-latest the graphqland authors. All rights reserved. MIT license.
// This module is browser compatible.

import { ExecutionParams } from "./deps.ts";

export type HandlerOptions = Omit<ExecutionParams, "schema">;
