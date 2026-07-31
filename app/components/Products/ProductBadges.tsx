import {
  getBottomRightBadgePlacementId,
  getTopLeftBadgePlacementId,
  type ProductBadgePlacementContext,
} from '~/lib/coveo/engine';

interface Badge {
  text: string;
  backgroundColor: string;
  textColor: string;
  iconUrl: string | null;
}

export interface BadgePlacement {
  placementId: string;
  badges: Badge[];
}

export type BadgePlacementContext = ProductBadgePlacementContext | null;

interface ProductBadgesProps {
  badgePlacements?: BadgePlacement[];
  context: BadgePlacementContext;
}

function BadgeList({badges}: {badges: Badge[]}) {
  return (
    <>
      {badges.map((badge, index) => (
        <div
          key={`${badge.text}-${index}`}
          className="inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shadow-sm"
          style={{
            backgroundColor: badge.backgroundColor,
            color: badge.textColor,
          }}
        >
          <span className="truncate">{badge.text}</span>
          {badge.iconUrl && (
            <img
              src={badge.iconUrl}
              alt=""
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
            />
          )}
        </div>
      ))}
    </>
  );
}

export function ProductBadges({
  badgePlacements = [],
  context,
}: ProductBadgesProps) {
  if (!context) {
    return null;
  }

  const topLeftPlacement = badgePlacements.find(
    ({placementId}) => placementId === getTopLeftBadgePlacementId(context),
  );
  const bottomRightPlacement = badgePlacements.find(
    ({placementId}) => placementId === getBottomRightBadgePlacementId(context),
  );
  const bottomRightBadges = bottomRightPlacement?.badges.slice(0, 3) ?? [];

  return (
    <>
      {!!topLeftPlacement?.badges.length && (
        <div className="pointer-events-none absolute left-2 top-2 z-[1] flex max-w-[calc(100%-1rem)] flex-wrap gap-2">
          <BadgeList badges={topLeftPlacement.badges} />
        </div>
      )}
      {bottomRightBadges.length > 0 && (
        <div
          className={`pointer-events-none absolute bottom-2 right-2 z-[1] flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-2 ${
            context !== 'pdp'
              ? 'opacity-0 transition-opacity duration-150 group-hover:opacity-100'
              : ''
          }`}
        >
          <BadgeList badges={bottomRightBadges} />
        </div>
      )}
    </>
  );
}
