import { AuthProvider } from "./AuthContext";
import { FamilyProvider } from "./FamilyContext";
import { EventProvider } from "./EventContext";
import { UIProvider } from "./UIContext";

export const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <FamilyProvider>
      <UIProvider>
        <EventProvider>
            {children}
        </EventProvider>
        </UIProvider>
      </FamilyProvider>
    </AuthProvider>
  );
};

export default AppProviders;
