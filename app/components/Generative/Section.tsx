import cx from '~/lib/cx';

export function AnswerSection({
  children,
  className = '',
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cx('min-h-24', className);
  return <section className={classes}>{children}</section>;
}
