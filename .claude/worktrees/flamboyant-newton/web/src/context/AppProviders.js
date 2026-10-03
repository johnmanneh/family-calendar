import { AuthProvider } from "./AuthContext";
import { FamilyProvider } from "./FamilyContext";
import { EventProvider } from "./EventContext";
import { UIProvider } from "./UIContext";
import { GroupProvider } from "./GroupContext";

export const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <FamilyProvider>
        <UIProvider>
          <EventProvider>
            <GroupProvider>
              {children}
            </GroupProvider>
          </EventProvider>
        </UIProvider>
      </FamilyProvider>
    </AuthProvider>
  );
};

export default AppProviders;
