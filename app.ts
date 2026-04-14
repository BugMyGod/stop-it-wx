import { authService } from "./services/auth";

App<IAppOption>({
  globalData: {
    appName: "StopIt回应助手",
  },
  onLaunch() {
    authService.bootstrap();
  },
});
