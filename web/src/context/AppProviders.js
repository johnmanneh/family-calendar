import { AuthProvider } from "./AuthContext";
import { FamilyProvider } from "./FamilyContext";
import { EventProvider } from "./EventContext";
import { UIProvider } from "./UIContext";
import { GroupProvider } from "./GroupContext";
import { ThemeProvider } from "./ThemeContext";

export const AppProviders = ({ children }) => {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
};

export default AppProviders;
