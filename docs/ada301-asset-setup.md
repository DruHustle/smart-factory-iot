# ADA031 V4 robotic-arm asset setup

The dashboard models the arm as an AAS `robotic_arm` with Nameplate, Technical Data, Maintenance Instructions, Digital Product Passport, and Operational Data submodels. Register it from **Assets → Create asset**, select **Robotic arm**, connect it through a Raspberry Pi gateway using `ada031_v4_serial`, and use a stable endpoint such as `serial:///dev/serial/by-id/...?...baudrate=9600`.

## Controller firmware

[`firmware/ada301/AdeeptArmConnected.ino`](../firmware/ada301/AdeeptArmConnected.ino) retains the vendor jog keys and adds these allowlisted commands:

| Dashboard action | Serial byte | Meaning |
| --- | --- | --- |
| `set_profile / pick_and_place_repeat` | `P` | Repeat the user-defined A → B → A poses |
| `set_profile / demonstration_moves` | `D` | Repeat pickup and rotation poses |
| `stop_program` | `S` | Finish the current pose, then idle |
| `neutral` | `N` | Move every controlled servo to 90° |

The ArmBoard pushbutton (pin 4, active LOW with the internal pull-up enabled) starts the A → B → A repeat when idle. Pressing it again interrupts the current movement, then slews the servos to 90° one at a time in this order: gripper, wrist, elbow, shoulder, base. The dashboard/serial `P` command also starts A → B → A.

The repeat profile uses the user-defined Point A and Point B stored in [`calibration-points.json`](../firmware/ada301/calibration-points.json), following `A → B → A`. The observed Point B is at the configured command limits for the base, shoulder, and wrist; use the dashboard motion confirmation and supervise initial operation closely.

The Node API publishes version-2 high-level commands. DeviceService and the Pi gateway must validate the action/profile allowlists, translate only the four rows above, reject retained or expired commands, and retain their existing asset allowlist, rate limit, and replay protection. Until that companion deployment is upgraded, the new dashboard actions will be rejected and must not be represented as active.

## Telemetry and performance

The sketch emits newline-delimited JSON at 9600 baud on state changes and every two seconds while idle. The Pi attributes it to the arm's AAS ID and publishes these numeric signals in `assetSignals`:

- `cycle_count`, `successful_cycles`, `interrupted_cycles`, `failed_cycles`, and `cycle_time_ms` (`failed_cycles` is reserved because the unsensed controller cannot prove a physical failure)
- `active_profile` (`0` idle, `1` A → B → A repeat, `2` demonstration), `sequence_step` (`1` outbound A, `2` B, `3` return A), `movement_active`, `button_pressed`, and `uptime_ms`
- `calibration_mode` and `pots_matched`, plus `pot_1_deg` through `pot_5_deg` while calibration is active
- `servo_1_deg` through `servo_5_deg`

The AAS dashboard refreshes the newest linked reading every three seconds and shows cycle totals, successes/failures, success rate, latest cycle time, controller state, sequence step, pot match, and commanded joint angles. The 24-hour aggregate stays available for historical review. The serial gateway must forward the added numeric fields unchanged.

These are commanded targets, not measured joint positions. For meaningful condition monitoring, add current, voltage, joint-position, gripper/object detection, and temperature sensors and map their engineering units at the gateway.

## Safety boundary

The neutral command is not an off command: hobby servos remain energized and can still produce torque at 90°. `stop_program` is also not an emergency stop. Use the independent battery disconnect described by the operator for emergency power removal, and only claim an emergency-stop function after appropriate hardware and machinery-risk validation.

## Product passport

The AAS page opens a public, printable passport and QR label. The page deliberately calls itself a voluntary prototype. Regulation (EU) 2024/1781 requires the final carrier, identifiers, access rights, and product data to follow the applicable product-group delegated act; completing this prototype is not a declaration of conformity.
