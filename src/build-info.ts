declare const __PRISM_BASTION_COMMIT_DATE__: string | undefined;
declare const __PRISM_BASTION_COMMIT__: string | undefined;

export const BUILD_COMMIT_DATE = typeof __PRISM_BASTION_COMMIT_DATE__ === 'undefined'
  ? 'development'
  : __PRISM_BASTION_COMMIT_DATE__;
export const BUILD_COMMIT = typeof __PRISM_BASTION_COMMIT__ === 'undefined'
  ? 'development'
  : __PRISM_BASTION_COMMIT__;
