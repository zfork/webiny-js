import { I18NContentContext } from "@webiny/api-i18n-content/types";

export default async (context: I18NContentContext): Promise<boolean> => {
    // If `content.i18n` permission is not present, immediately throw.
    const contentPermission = await context.security.getPermission("content.i18n");
    if (!contentPermission) {
        return false;
    }

    // Otherwise, let's check if the identity has access to current content locale.
    // If `contentPermission.locales` array is present, that means identity's access is restricted
    // to the locales listed in it. If it's not present, that means there are no restrictions, or
    // in other words - identity can access all locales.
    return (
        !Array.isArray(contentPermission.locales) ||
        contentPermission.locales.includes(context?.i18nContent?.locale?.code)
    );
};
