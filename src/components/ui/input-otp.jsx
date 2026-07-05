import { useContext } from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function InputOTP({ className, containerClassName, ...props }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cx("input-otp-container", containerClassName)}
      className={cx("input-otp-input", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }) {
  return (
    <div
      data-slot="input-otp-group"
      className={cx("input-otp-group", className)}
      {...props}
    />
  );
}

function InputOTPSlot({ index, className, ...props }) {
  const inputOTPContext = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-active={isActive ? "true" : undefined}
      data-slot="input-otp-slot"
      className={cx("input-otp-slot", className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="input-otp-caret-wrap" aria-hidden="true">
          <div className="input-otp-caret" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ className, ...props }) {
  return (
    <div
      data-slot="input-otp-separator"
      role="separator"
      className={cx("input-otp-separator", className)}
      {...props}
    >
      <Minus size={14} strokeWidth={2} aria-hidden="true" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
