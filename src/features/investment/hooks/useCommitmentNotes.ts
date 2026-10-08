import { useEffect } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';
import { investmentApi } from '@/lib/api/investmentApi';
import { investmentEndpoints } from '../api/investmentApi';
import type { InvestmentNote, ListingInvestor } from '../types';

export interface HeldNote {
  note: InvestmentNote;
  /** Phần vốn đã sinh ra Note này, để tra người góp vốn. */
  commitment: ListingInvestor;
}

const notesEndpoint = investmentEndpoints.endpoints.getCommitmentNotes;

/**
 * Toàn bộ Note của một khoản vay, gom từ các phần vốn đã khóa.
 *
 * Backend chỉ có API Note theo từng phần vốn, nên hook đăng ký một query cho mỗi phần vốn
 * (một khoản vay có tới vài chục) và đọc kết quả từ cache RTK Query. Chỉ chạy khi quản trị
 * mở tab Note; rời tab thì hủy đăng ký để cache tự dọn. Phát hành Note làm mới tag
 * `CommitmentNotes`, nên các query đang đăng ký tự tải lại.
 */
export function useCommitmentNotes(commitments: ListingInvestor[]) {
  const dispatch = useDispatch<AppDispatch>();
  const ids = commitments.map((item) => item.commitmentId);
  // Khóa phụ thuộc là chuỗi: mảng mới mỗi lần render sẽ làm effect đăng ký lại liên tục.
  const key = ids.join(',');

  useEffect(() => {
    const subscriptions = (key ? key.split(',') : []).map((id) => dispatch(notesEndpoint.initiate(Number(id))));
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [dispatch, key]);

  const results = useSelector(
    (state: RootState) => ids.map((id) => notesEndpoint.select(id)(state)),
    shallowEqual,
  );

  const notes: HeldNote[] = [];
  results.forEach((result, index) => {
    result.data?.forEach((note) => notes.push({ note, commitment: commitments[index] }));
  });

  return {
    notes,
    isLoading: results.some((result) => result.isUninitialized || result.isLoading),
    error: results.find((result) => result.isError)?.error,
    retry: () => {
      dispatch(investmentApi.util.invalidateTags([{ type: 'CommitmentNotes', id: 'ALL' }]));
    },
  };
}
