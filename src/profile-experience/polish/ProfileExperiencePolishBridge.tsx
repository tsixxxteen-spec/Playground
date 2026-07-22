import {
  useEffect,
} from "react";

import {
  createProfilePolishRuntime,
} from "./profilePolishRuntime";

import "./profile-experience-polish.css";

export default function ProfileExperiencePolishBridge() {
  useEffect(() => {
    const runtime =
      createProfilePolishRuntime();

    document.dispatchEvent(
      new CustomEvent(
        "playground:profile-polish-ready",
      ),
    );

    return () => {
      runtime.destroy();
    };
  }, []);

  return null;
}
