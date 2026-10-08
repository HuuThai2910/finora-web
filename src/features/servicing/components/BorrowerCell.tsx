import { useUserLabel } from '../hooks/useUserLabel';

interface Props {
  borrowerId: string;
  loanNumber: string;
}

/** Ô "Người vay": họ tên là dòng chính, mã khoản vay là dòng phụ. */
export function BorrowerCell({ borrowerId, loanNumber }: Props) {
  const name = useUserLabel(borrowerId, `Người vay #${borrowerId}`);
  return (
    <>
      <span className="svc-who">{name}</span>
      <span className="ui-sub ui-mono">{loanNumber}</span>
    </>
  );
}
