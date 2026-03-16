type RunAgainstAvailableEndpointOptions<T> = {
  paths: readonly string[];
  request: (path: string) => Promise<T>;
  isUnavailableRoute: (error: unknown, path: string) => boolean;
  onAllRoutesUnavailable?: () => void;
};

export async function runAgainstAvailableEndpoint<T>({
  paths,
  request,
  isUnavailableRoute,
  onAllRoutesUnavailable,
}: RunAgainstAvailableEndpointOptions<T>): Promise<T | null> {
  let foundUnavailableRoute = false;

  for (const path of paths) {
    try {
      return await request(path);
    } catch (error) {
      if (isUnavailableRoute(error, path)) {
        foundUnavailableRoute = true;
        continue;
      }

      throw error;
    }
  }

  if (foundUnavailableRoute) {
    onAllRoutesUnavailable?.();
  }

  return null;
}
